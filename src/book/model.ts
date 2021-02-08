import { attr, fk, Model as ORMModel } from 'redux-orm';
import { Fields as AuthorFields } from '../author/model';

export interface Fields {
    name: string;
    authorId: number;
    author?: AuthorFields;
}

class Model extends ORMModel {
    static options = {
        idAttribute: 'id',
    };

    static modelName = 'Book';

    static fields = {
        name: attr(),
        nationality: attr(),
        authorId: fk({ to: 'Author', as: 'author', relatedName: 'books' }),
    };
}

export { Model };
